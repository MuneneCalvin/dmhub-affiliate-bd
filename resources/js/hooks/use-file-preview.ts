import { useEffect, useState } from 'react';

// Object URL for a picked file; revoked when the file changes or the component unmounts.
export function useFilePreview(file: File | null | undefined) {
    const [preview, setPreview] = useState<{ file: File; url: string } | null>(
        null,
    );
    if ((file ?? null) !== (preview?.file ?? null)) {
        setPreview(file ? { file, url: URL.createObjectURL(file) } : null);
    }
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview.url);
        },
        [preview],
    );
    return preview?.url ?? '';
}
