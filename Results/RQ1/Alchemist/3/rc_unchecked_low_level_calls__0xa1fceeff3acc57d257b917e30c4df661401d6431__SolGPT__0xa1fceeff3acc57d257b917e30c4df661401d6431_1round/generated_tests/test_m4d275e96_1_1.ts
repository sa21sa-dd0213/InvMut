import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m4d275e96", function () {
    it("should revert when tos.length > vs.length (original behavior)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("AirDropContract");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20 token to use as the contract_address
        const TokenFactory = await ethers.getContractFactory("MockERC20");
        const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
        await token.waitForDeployment();

        // Approve the AirDropContract to transfer tokens from owner
        await token.approve(await instance.getAddress(), ethers.parseEther("100"));

        // Test case: 3 recipients but only 2 values (tos.length > vs.length)
        const tos = [addr1.address, addr2.address, owner.address];
        const vs = [ethers.parseEther("10"), ethers.parseEther("20")];

        await expect(
            instance.transfer(await token.getAddress(), tos, vs)
        ).to.be.reverted;
    });
});