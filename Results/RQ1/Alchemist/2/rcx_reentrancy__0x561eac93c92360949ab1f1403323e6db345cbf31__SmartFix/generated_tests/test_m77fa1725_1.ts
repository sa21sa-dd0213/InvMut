import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test", function () {
    it("should kill mutant m77fa1725 by calling Collect with balance > MinSum", async function () {
        const [owner, user] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("BANK_SAFE");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Set MinSum to a specific value (e.g., 1 ether)
        await instance.SetMinSum(ethers.parseEther("1"));
        
        // Initialize the contract
        await instance.Initialized();

        // User deposits 2 ether (balance > MinSum)
        await instance.connect(user).Deposit({ value: ethers.parseEther("2") });

        // User tries to collect 1 ether
        // In the original: should succeed (2 >= 1 && 2 >= 1)
        // In the mutant: should revert (2 <= 1 is false)
        await expect(
            instance.connect(user).Collect(ethers.parseEther("1"))
        ).to.be.reverted;
    });
});