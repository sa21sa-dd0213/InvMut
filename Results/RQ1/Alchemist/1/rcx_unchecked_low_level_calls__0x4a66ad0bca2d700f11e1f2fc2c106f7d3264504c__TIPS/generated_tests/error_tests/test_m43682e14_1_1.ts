import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m43682e14", function () {
    it("should kill mutant by calling transfer with non-empty array, which passes on original but fails on mutant due to inverted length check", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // The transfer function requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // We need to impersonate that address or use a signer with that address
        // Since we cannot control the private key of that address, we will use hardhat's impersonation
        await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
        const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

        // Fund the impersonated account to pay for gas
        await owner.sendTransaction({
            to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
            value: ethers.parseEther("1")
        });

        const recipients = ["0x0000000000000000000000000000000000000001"];
        const amounts = [1]; // 1 token (will be multiplied by 1e18 inside the contract)

        // On original: should succeed because _tos.length (1) > 0
        // On mutant: will revert because 1 < 0 is false
        await expect(
            instance.connect(impersonatedSigner).transfer(recipients, amounts)
        ).to.be.reverted;

        // Stop impersonation
        await ethers.provider.send("hardhat_stopImpersonatingAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    });
});