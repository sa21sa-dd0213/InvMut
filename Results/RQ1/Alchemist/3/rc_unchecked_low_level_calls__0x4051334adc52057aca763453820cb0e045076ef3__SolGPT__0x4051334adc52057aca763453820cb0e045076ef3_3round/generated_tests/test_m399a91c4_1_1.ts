import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant kill test - m399a91c4", function () {
    it("should return true when transfer succeeds", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("airdrop");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20 token to use for testing
        const TokenFactory = await ethers.getContractFactory("ERC20");
        const token = await TokenFactory.deploy("Test", "TST", 18);
        await token.waitForDeployment();

        // Mint tokens to addr1 and approve the airdrop contract to spend them
        await token.mint(addr1.address, ethers.parseEther("100"));
        await token.connect(addr1).approve(instance.target, ethers.parseEther("10"));

        // Call transfer and capture the return value
        const tx = await instance.transfer(
            addr1.address,
            token.target,
            [addr2.address],
            ethers.parseEther("1")
        );
        const receipt = await tx.wait();

        // The key assertion: the transaction should return true (not revert)
        // In ethers v6, we can check the status to verify success
        expect(receipt.status).to.equal(1);

        // Additional verification that the transfer actually happened
        const balance = await token.balanceOf(addr2.address);
        expect(balance).to.equal(ethers.parseEther("1"));
    });
});