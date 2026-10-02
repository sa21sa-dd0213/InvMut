import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test", function () {
    it("should return true when transfer function succeeds", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("demo");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20 token that has transferFrom functionality
        const TokenFactory = await ethers.getContractFactory("ERC20Mock");
        const token = await TokenFactory.deploy("Test", "TST", 18);
        await token.waitForDeployment();

        // Mint tokens to owner and approve the demo contract to spend them
        const mintAmount = ethers.parseEther("100");
        await token.mint(owner.address, mintAmount);
        await token.approve(instance.target, mintAmount);

        // Create array of recipients
        const recipients = [addr1.address, addr2.address];
        const transferAmount = ethers.parseEther("10");

        // Call the transfer function and capture the return value
        const tx = await instance.transfer(
            owner.address,
            token.target,
            recipients,
            transferAmount
        );
        const receipt = await tx.wait();

        // Get the return value from the transaction
        const result = await instance.transfer.staticCall(
            owner.address,
            token.target,
            recipients,
            transferAmount
        );

        // The original returns true; the mutant returns false
        expect(result).to.equal(true);
    });
});