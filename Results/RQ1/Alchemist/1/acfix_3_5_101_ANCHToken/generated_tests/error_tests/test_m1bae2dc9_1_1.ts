import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - balanceOf return removal", function () {
    it("should return actual balance for a token holder, killing the mutant that removes return statement", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy with required constructor arguments
        // Note: The contract requires a router address and a USD token address
        // For testing, we'll use zero addresses as placeholders since we only need to test balanceOf
        
        // We need to deploy with actual addresses - using zero addresses for test purposes
        // In real scenario, these would be actual contract addresses
        const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
        const token = await ANCHTokenFactory.deploy(
            "0x0000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000002"
        );
        await token.waitForDeployment();

        // The owner should have the total supply after deployment
        const ownerBalance = await token.balanceOf(owner.address);
        
        // Verify owner has tokens (should be 10,000,000 * 10^18)
        expect(ownerBalance).to.be.gt(0);
        
        // Also verify addr1 has 0 balance
        const addr1Balance = await token.balanceOf(addr1.address);
        expect(addr1Balance).to.equal(0);
        
        // Transfer some tokens to addr1
        const transferAmount = ethers.parseEther("100");
        await token.connect(owner).transfer(addr1.address, transferAmount);
        
        // Check addr1's balance after transfer
        const addr1BalanceAfter = await token.balanceOf(addr1.address);
        expect(addr1BalanceAfter).to.equal(transferAmount);
        
        // The mutant would return 0 for all these calls, so this assertion would fail
        // thus "killing" the mutant
    });
});