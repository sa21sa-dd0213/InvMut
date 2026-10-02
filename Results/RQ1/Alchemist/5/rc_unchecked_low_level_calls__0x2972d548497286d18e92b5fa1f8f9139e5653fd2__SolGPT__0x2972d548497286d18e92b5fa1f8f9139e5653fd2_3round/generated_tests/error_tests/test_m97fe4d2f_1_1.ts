import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m97fe4d2f test", function () {
    it("should return true on successful transfer and kill mutant that removes return true", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("demo");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20 token that implements transferFrom
        const TokenFactory = await ethers.getContractFactory("ERC20Mock");
        const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
        await token.waitForDeployment();

        // Approve the demo contract to spend tokens on behalf of owner
        await token.approve(await instance.getAddress(), ethers.parseEther("100"));

        // Transfer tokens from owner to addr1
        const tos = [await addr1.getAddress()];
        const values = [ethers.parseEther("10")];

        const tx = await instance.transfer(
            await owner.getAddress(),
            await token.getAddress(),
            tos,
            values
        );
        const receipt = await tx.wait();

        // The return value should be true - this will fail on the mutant
        expect(tx).to.emit(instance, "Transfer"); // Just to ensure tx succeeded
        // Actually check the return value from the transaction
        const result = await instance.callStatic.transfer(
            await owner.getAddress(),
            await token.getAddress(),
            tos,
            values
        );
        expect(result).to.equal(true);
    });
});