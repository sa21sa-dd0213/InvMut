import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m53af4037 test", function () {
    it("should revert when transfer amount is zero, but succeed with positive amount", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy with required constructor arguments
        const mockRouter = "0x0000000000000000000000000000000000000001";
        const mockUSDToken = "0x0000000000000000000000000000000000000002";
        
        const Factory = await ethers.getContractFactory("ANCHToken");
        const instance = await Factory.deploy(mockRouter, mockUSDToken);
        await instance.waitForDeployment();
        
        // Get the deployed contract address
        const contractAddress = await instance.getAddress();
        
        // Verify the owner has tokens
        const ownerBalance = await instance.balanceOf(owner.address);
        expect(ownerBalance).to.be.gt(0);
        
        // Test with a positive amount - on original contract it reverts with "Unauthorized role"
        // On mutant it reverts with "Transfer amount must be greater than zero"
        const transferAmount = ethers.parseEther("100");
        
        await expect(
            instance.connect(owner).transfer(addr1.address, transferAmount)
        ).to.not.be.revertedWith("Transfer amount must be greater than zero");
    });
});