import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - access control removal", function () {
    it("should revert when called from unauthorized address in original, but not in mutant", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy the contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Prepare test data
        const recipients = [await addr2.getAddress()];
        const amounts = [1]; // 1 token
        
        // Attempt to call transfer from an unauthorized address (addr1)
        // In the original, this should revert because msg.sender != 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // In the mutant, the require is removed, so it will not revert
        await expect(
            instance.connect(addr1).transfer(recipients, amounts)
        ).to.be.reverted;
    });
});