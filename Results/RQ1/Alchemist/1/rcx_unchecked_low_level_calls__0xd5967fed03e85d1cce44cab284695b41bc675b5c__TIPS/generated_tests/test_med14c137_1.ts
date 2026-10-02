import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - med14c137", function () {
    it("should revert when external call succeeds (mutant always reverts)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("demo");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20-like token that has transferFrom
        const TokenFactory = await ethers.getContractFactory("MockERC20");
        const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
        await token.waitForDeployment();

        // Owner approves addr1 to spend tokens
        await token.approve(addr1.address, ethers.parseEther("100"));
        
        // Fund addr2 with tokens via transferFrom from owner to addr2
        const recipients = [addr2.address];
        const amount = ethers.parseEther("10");

        // This call should succeed in original (transferFrom works) but fail in mutant (always reverts)
        await expect(
            instance.connect(addr1).transfer(
                owner.address,
                await token.getAddress(),
                recipients,
                amount
            )
        ).to.not.be.reverted;
    });
});