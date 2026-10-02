import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m97fe4d2f test", function () {
    it("should return true on successful transfer, killing mutant that removed return true", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("demo");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20 token for testing
        const TokenFactory = await ethers.getContractFactory("ERC20");
        const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
        await token.waitForDeployment();

        // Mint tokens to owner
        await token.mint(owner.address, ethers.parseEther("100"));

        // Approve demo contract to spend owner's tokens
        await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("50"));

        // Prepare test data
        const recipients = [addr1.address, addr2.address];
        const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

        // Call transfer function and capture return value using staticCall
        const returnValue = await instance.connect(owner).transfer.staticCall(
            owner.address,
            await token.getAddress(),
            recipients,
            amounts
        );
        
        expect(returnValue).to.equal(true);
        
        // Verify the actual transfer happened
        const tx = await instance.connect(owner).transfer(
            owner.address,
            await token.getAddress(),
            recipients,
            amounts
        );
        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
    });
});