import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - withApproval modifier", function () {
  it("should revert when non-owner calls deposit with different owner address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock token for asset and share
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const asset = await MockTokenFactory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    const share = await MockTokenFactory.deploy("Share", "SHR", 18);
    await share.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
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
    
    // Test: addr1 tries to call deposit with owner=addr2 (different from msg.sender)
    // This should revert in the original contract but might pass in the mutant
    await expect(
      instance.connect(addr1).deposit(ethers.parseEther("100"), addr2.address)
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
  
  it("should revert when non-owner calls withdraw with different owner address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Same deployment as above
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const asset = await MockTokenFactory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    const share = await MockTokenFactory.deploy("Share", "SHR", 18);
    await share.waitForDeployment();
    
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
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
    
    // Test: addr1 tries to call withdraw with owner=addr2
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("50"), addr1.address, addr2.address)
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
  
  it("should revert when non-owner calls redeem with different owner address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const asset = await MockTokenFactory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    const share = await MockTokenFactory.deploy("Share", "SHR", 18);
    await share.waitForDeployment();
    
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
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
    
    // Test: addr1 tries to call redeem with owner=addr2
    await expect(
      instance.connect(addr1).redeem(ethers.parseEther("10"), addr1.address, addr2.address)
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});