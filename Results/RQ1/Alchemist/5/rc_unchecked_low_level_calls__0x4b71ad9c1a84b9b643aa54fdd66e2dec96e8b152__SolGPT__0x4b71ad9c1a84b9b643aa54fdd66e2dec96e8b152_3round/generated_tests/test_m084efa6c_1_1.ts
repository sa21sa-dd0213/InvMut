import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m084efa6c test", function () {
    it("should revert when a transferFrom call fails in the original, but not in the mutant", async function () {
        const [owner, from, to] = await ethers.getSigners();
        
        // Deploy the airPort contract
        const Factory = await ethers.getContractFactory("airPort");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy a simple ERC20 token to use as caddress
        const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
        const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
        await token.waitForDeployment();
        
        // Fund the 'from' address with tokens
        await token.transfer(from.address, ethers.parseEther("100"));
        
        // Try to transferFrom without approval - this should fail
        const recipients = [to.address];
        const amount = ethers.parseEther("10");
        
        // This should revert because 'from' hasn't approved the transfer
        await expect(
            instance.connect(owner).transfer(
                from.address,
                await token.getAddress(),
                recipients,
                amount
            )
        ).to.be.reverted;
    });
});