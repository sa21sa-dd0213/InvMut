import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - m48cf8748", function () {
  it("should detect missing Withdraw event emission in withdraw function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const asset = await ERC20Factory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    // Deploy mock TrancheTokenLike
    const TrancheTokenFactory = await ethers.getContractFactory("TrancheTokenMock");
    const share = await TrancheTokenFactory.deploy("Share", "SHR", 18);
    await share.waitForDeployment();
    
    // Deploy mock InvestmentManagerLike
    const InvestmentManagerFactory = await ethers.getContractFactory("InvestmentManagerMock");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with constructor args
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const instance = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Setup: authorize owner
    // Owner is already authorized by constructor
    
    // Mint some shares to owner to allow withdrawal
    await share.mint(owner.address, ethers.parseEther("100"));
    
    // Setup investment manager mock to return a value for processWithdraw
    await investmentManager.setProcessWithdrawReturn(ethers.parseEther("50"));
    
    // Perform withdrawal and check for event emission
    const assets = ethers.parseEther("100");
    const tx = await instance.connect(owner).withdraw(assets, owner.address, owner.address);
    const receipt = await tx.wait();
    
    // Verify Withdraw event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Withdraw")
      .withArgs(
        await instance.getAddress(), // sender (this contract)
        owner.address,               // receiver
        owner.address,               // owner
        assets,                      // assets
        ethers.parseEther("50")      // sharesRedeemed (from mock)
      );
  });
});