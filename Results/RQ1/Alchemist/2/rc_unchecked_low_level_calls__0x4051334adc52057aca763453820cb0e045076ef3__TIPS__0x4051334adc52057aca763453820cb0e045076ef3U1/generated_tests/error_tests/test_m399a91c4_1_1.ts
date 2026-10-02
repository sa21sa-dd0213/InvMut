import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m399a91c4 test", function () {
    it("should return true when transfer succeeds, killing mutant that removes return true", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy a simple ERC20 token that has transferFrom
        const TokenFactory = await ethers.getContractFactory("ERC20Mock");
        const token = await TokenFactory.deploy("Test", "TST", 18);
        await token.waitForDeployment();
        
        // Deploy the airdrop contract
        const AirdropFactory = await ethers.getContractFactory("airdrop");
        const airdrop = await AirdropFactory.deploy();
        await airdrop.waitForDeployment();
        
        // Mint tokens to owner and approve airdrop contract to transfer
        const amount = ethers.parseEther("100");
        await token.mint(owner.address, amount);
        await token.approve(airdrop.target, amount);
        
        // Create array of recipients
        const recipients = [addr1.address];
        
        // Call transfer function and capture return value
        const tx = await airdrop.transfer(
            owner.address,
            token.target,
            recipients,
            ethers.parseEther("10")
        );
        const receipt = await tx.wait();
        
        // For Hardhat, we need to check the return value differently
        // The mutant removes return true, so it returns false instead
        const result = await airdrop.transfer.staticCall(
            owner.address,
            token.target,
            recipients,
            ethers.parseEther("10")
        );
        
        expect(result).to.equal(true);
    });
});