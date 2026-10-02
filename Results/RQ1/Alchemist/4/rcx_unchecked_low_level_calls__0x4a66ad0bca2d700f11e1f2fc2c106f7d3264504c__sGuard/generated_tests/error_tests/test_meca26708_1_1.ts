import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant meca26708 test", function () {
    it("should kill the mutant by verifying from address is not zero in transfer call", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy the contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Get the original hardcoded from address
        const originalFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        
        // Prepare test data
        const recipients = [addr1.address];
        const amounts = [1]; // 1 token (will be multiplied by 10^18 in the contract)
        
        // Call transfer as the authorized sender (original from address)
        await expect(
            instance.connect(owner).transfer(recipients, amounts)
        ).to.not.be.reverted;
        
        // Verify the from address stored in the contract is still the original, not zero
        const fromAddress = await instance.from();
        expect(fromAddress).to.equal(originalFrom);
        expect(fromAddress).to.not.equal(ethers.ZeroAddress);
    });
});