import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should return true when transfer is successful, killing mutant that removes return true", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("airPort");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20-like token for testing
        const TokenFactory = await ethers.getContractFactory("contracts/test/TestToken.sol:TestToken");
        const token = await TokenFactory.deploy("Test", "TST", 18);
        await token.waitForDeployment();

        // Mint tokens to owner and approve the airPort contract to spend them
        const mintAmount = ethers.parseEther("100");
        await token.mint(owner.address, mintAmount);
        await token.approve(await instance.getAddress(), mintAmount);

        // Prepare transfer parameters
        const tos = [addr1.address, addr2.address];
        const value = ethers.parseEther("10");

        // Call transfer function and check it returns true
        const tx = await instance.transfer(owner.address, await token.getAddress(), tos, value);
        const receipt = await tx.wait();

        // The return value from the function should be true
        // Since ethers v6 returns the transaction response, we need to check the return value via a static call
        const result = await instance.transfer.staticCall(owner.address, await token.getAddress(), tos, value);
        expect(result).to.equal(true);
    });
});