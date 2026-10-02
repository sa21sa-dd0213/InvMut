import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m61a83b56", function () {
    it("should detect mutant by passing with multiplication but reverting with exponentiation", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // The contract's from address is hardcoded to 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // We need to use the owner as that address for the test to pass the require check
        // Use hardhat's impersonate functionality to act as the hardcoded from address
        const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
        const fromSigner = await ethers.getSigner(fromAddress);
                
        // Fund the impersonated account with some ETH for gas
        await owner.sendTransaction({
            to: fromAddress,
            value: ethers.parseEther("1.0")
        });

        // Prepare test data: one recipient, v = 2 (small integer > 1)
        const recipients = ["0x0000000000000000000000000000000000000001"];
        const values = [2];

        // This call should revert on the mutant (2**1e18 causes overflow)
        // but pass on the original (2 * 1e18 is valid)
        await expect(
            instance.connect(fromSigner).transfer(recipients, values)
        ).to.be.reverted;

        // Stop impersonating
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
    });
});