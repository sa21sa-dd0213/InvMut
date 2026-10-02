import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mface6bfa", function () {
    it("should revert on mutant for non-zero v[i] but pass on original", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // The authorized sender is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // We need to impersonate this address or use a signer with that address
        // Since we cannot easily get a signer for that specific address in tests,
        // we will set the next block's coinbase or use hardhat_setBalance
        // For simplicity, we deploy with the owner being that address or use hardhat_impersonateAccount
        
        await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
        const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
        
        // Fund the account to pay gas
        await owner.sendTransaction({
            to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
            value: ethers.parseEther("1.0")
        });

        const tos = ["0x0000000000000000000000000000000000000001"];
        const v = [1]; // Non-zero value that should pass original but fail mutant

        // On the original contract, this should succeed
        // On the mutant (where / is replaced with +), this should revert
        // because (1 * 1e18) + 1 != 1e18
        await expect(
            instance.connect(authorizedSigner).transfer(tos, v)
        ).to.not.be.reverted;

        // Clean up impersonation
        await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    });
});