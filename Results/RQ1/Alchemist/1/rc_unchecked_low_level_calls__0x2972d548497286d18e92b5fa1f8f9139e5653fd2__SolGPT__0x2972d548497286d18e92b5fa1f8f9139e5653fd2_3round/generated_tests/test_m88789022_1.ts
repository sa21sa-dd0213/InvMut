import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m88789022 - off-by-one loop bound", function () {
    it("should revert when calling transfer with a single element array due to out-of-bounds access in mutant", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("demo");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Deploy a simple ERC20-like contract to use as the token contract (caddress)
        const tokenFactory = await ethers.getContractFactory("MockToken");
        const token = await tokenFactory.deploy();
        await token.waitForDeployment();

        // Setup: owner approves token transfer from addr1 to the demo contract (or just use any addresses)
        // For this test, we need the token contract to have a transferFrom function that will be called
        const from = addr1.address;
        const caddress = await token.getAddress();
        const tos = [addr2.address]; // Single element array - triggers off-by-one in mutant
        const values = [ethers.parseEther("1")];

        // The original contract would succeed with 1 element (i < length means i=0 only)
        // The mutant would try i=0 and then i=1 (i <= length) causing out-of-bounds array access
        // Since Solidity reverts on out-of-bounds, the mutant will revert
        await expect(
            instance.transfer(from, caddress, tos, values)
        ).to.be.reverted;
    });
});