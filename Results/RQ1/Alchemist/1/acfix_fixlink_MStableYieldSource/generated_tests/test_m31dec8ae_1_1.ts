import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test", function () {
    it("should emit Supplied event when supplyTokenTo is called; mutant without event emission will fail", async function () {
        const [owner, addr1] = await ethers.getSigners();

        // Deploy a simple ERC20 token for testing
        const SimpleERC20 = await ethers.getContractFactory("contracts/test/SimpleERC20.sol:SimpleERC20");
        const token = await SimpleERC20.deploy("Test", "TST", ethers.parseEther("1000000"));
        await token.waitForDeployment();

        // Deploy a simple mock savings contract that returns the token as underlying
        const MockSavingsV2 = await ethers.getContractFactory("contracts/test/MockSavingsV2.sol:MockSavingsV2");
        const savingsMock = await MockSavingsV2.deploy(await token.getAddress());
        await savingsMock.waitForDeployment();

        // Deploy MStableYieldSource
        const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
        const yieldSource = await MStableYieldSource.deploy(await savingsMock.getAddress());
        await yieldSource.waitForDeployment();

        // Transfer tokens to addr1 so they can supply
        await token.transfer(addr1.address, ethers.parseEther("1000"));

        // Approve yieldSource to spend tokens from addr1
        await token.connect(addr1).approve(await yieldSource.getAddress(), ethers.parseEther("1000"));

        // Call supplyTokenTo and check for Supplied event
        const supplyAmount = ethers.parseEther("100");
        const tx = await yieldSource.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
        
        // Check that the Supplied event was emitted
        await expect(tx)
            .to.emit(yieldSource, "Supplied")
            .withArgs(addr1.address, addr1.address, supplyAmount);
    });
});