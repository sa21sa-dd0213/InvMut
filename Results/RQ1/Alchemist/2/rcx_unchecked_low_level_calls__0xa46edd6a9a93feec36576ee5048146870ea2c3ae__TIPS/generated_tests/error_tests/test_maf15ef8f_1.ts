import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant maf15ef8f test", function () {
    it("should return true when transfer succeeds, detecting mutant that removes return true", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple token contract to use as the caddress parameter
        const TokenFactory = await ethers.getContractFactory("ERC20Mock");
        const token = await TokenFactory.deploy("Mock", "MCK", 18);
        await token.waitForDeployment();

        // Give owner some tokens and approve the EBU contract to transferFrom
        await token.mint(owner.address, ethers.parseEther("100"));
        await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("10"));

        const tos = [addr1.address];
        const amounts = [ethers.parseEther("1")];

        const tx = await instance.connect(owner).transfer(
            owner.address,
            await token.getAddress(),
            tos,
            amounts
        );
        const receipt = await tx.wait();

        // The return value of the function call should be true
        // The mutant removes "return true" causing default false return
        const result = await tx;
        expect(result).to.equal(true);
    });
});