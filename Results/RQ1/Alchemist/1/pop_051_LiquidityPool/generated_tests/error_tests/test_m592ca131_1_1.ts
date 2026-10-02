import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - transfer return value", function () {
  it("should return true for a successful transfer, killing the mutant that omits the return", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token to use as asset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20Factory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();

    // Deploy a mock TrancheToken
    const MockTrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const share = await MockTrancheTokenFactory.deploy("Share", "SHR", 18);
    await share.waitForDeployment();

    // Deploy a mock InvestmentManager
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();

    // Deploy LiquidityPool with constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();

    // Authorize the owner to mint/burn
    await liquidityPool.connect(owner).rely(owner.address);

    // Mint some shares to addr1 so they have tokens to transfer
    const mintAmount = ethers.parseEther("100");
    await share.mint(addr1.address, mintAmount);

    // Approve the liquidityPool to transfer shares on behalf of addr1
    await share.connect(addr1).approve(await liquidityPool.getAddress(), mintAmount);

    // Perform transfer through LiquidityPool's transfer function
    const transferAmount = ethers.parseEther("10");
    const tx = await liquidityPool.connect(addr1).transfer(owner.address, transferAmount);
    const receipt = await tx.wait();

    // The mutant's transfer function will return false instead of the actual result
    // We need to check the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address, uint256) returns (bool)"]);
    const decodedData = iface.decodeFunctionResult("transfer", receipt!.logs[0].data);
    const returnValue = decodedData[0];

    // The original returns true for successful transfers, the mutant returns false
    expect(returnValue).to.equal(true);
  });
});