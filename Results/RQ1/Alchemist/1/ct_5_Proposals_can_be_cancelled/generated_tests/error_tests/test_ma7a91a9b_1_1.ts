import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant ma7a91a9b - init re-initialization guard", function () {
    it("should revert when init() is called a second time", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy the DAO contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("DAO");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Deploy mock contracts for VADER, USDV, and VAULT
        const MockERC20Factory = await ethers.getContractFactory("iERC20");
        const mockVADER = await MockERC20Factory.deploy();
        await mockVADER.waitForDeployment();
        
        const mockUSDV = await MockERC20Factory.deploy();
        await mockUSDV.waitForDeployment();
        
        const MockVAULTFactory = await ethers.getContractFactory("iVAULT");
        const mockVAULT = await MockVAULTFactory.deploy();
        await mockVAULT.waitForDeployment();
        
        // First call to init() should succeed
        await expect(instance.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress())).to.not.be.reverted;
        
        // Second call to init() should revert because the contract is already initialized
        await expect(
            instance.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress())
        ).to.be.reverted;
    });
});