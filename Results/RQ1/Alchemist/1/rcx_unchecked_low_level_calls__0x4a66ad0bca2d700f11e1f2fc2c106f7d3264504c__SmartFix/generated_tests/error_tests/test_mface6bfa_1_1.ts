import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mface6bfa", function () {
    it("should revert on mutant for non-zero v[i] but pass on original", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Impersonate the authorized sender
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
        await expect(
            instance.connect(authorizedSigner).transfer(tos, v)
        ).to.not.be.reverted;

        // Clean up impersonation
        await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    });
});