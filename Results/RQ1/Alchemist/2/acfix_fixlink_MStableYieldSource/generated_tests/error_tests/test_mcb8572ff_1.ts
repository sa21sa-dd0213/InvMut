import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MStableYieldSource - Kill mutant mcb8572ff (division instead of subtraction)", function () {
    it("should kill the mutant by redeeming tokens when mAssetBalanceBefore equals mAssetBalanceAfter", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy a mock savings contract that returns zero underlying tokens on redeem
        const MockSavingsFactory = await ethers.getContractFactory("MockSavingsV2");
        const mockSavings = await MockSavingsFactory.deploy();
        await mockSavings.waitForDeployment();
        
        // Deploy the MStableYieldSource with the mock savings contract
        const Factory = await ethers.getContractFactory("MStableYieldSource");
        const instance = await Factory.deploy(await mockSavings.getAddress());
        await instance.waitForDeployment();
        
        // Get the mAsset token address from the deployed instance
        const mAssetAddress = await instance.depositToken();
        const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);
        
        // Fund the contract with some mAsset tokens so balanceOf can work
        const depositAmount = ethers.parseEther("100");
        await mAsset.transfer(await instance.getAddress(), depositAmount);
        
        // Simulate the scenario where redeem returns zero actual tokens
        // by having the mock savings contract's redeemUnderlying return 0 credits
        // and the mAsset balance before equals balance after
        await mockSavings.setRedeemUnderlyingResult(0);
        
        // The contract needs some imBalances to allow redeem
        await instance.connect(owner).supplyTokenTo(ethers.parseEther("10"), owner.address);
        
        // Now attempt to redeem - in original: mAssetsActual = balanceAfter - balanceBefore = 0
        // In mutant: mAssetsActual = balanceAfter / balanceBefore = 1 (division by same value)
        const tx = instance.connect(owner).redeemToken(ethers.parseEther("10"));
        
        // The original should return 0, but the mutant returns 1
        // We can detect this by checking the event or return value
        await expect(tx).to.emit(instance, "Redeemed")
            .withArgs(owner.address, ethers.parseEther("10"), 0);
    });
});