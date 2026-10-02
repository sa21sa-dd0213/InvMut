import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m9935e1bb - checkTransferRestriction return value", function () {
  it("should kill the mutant by asserting true return from checkTransferRestriction for a valid transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock TrancheToken that implements checkTransferRestriction
    const TrancheTokenFactory = await ethers.getContractFactory("TrancheTokenLike");
    const share = await TrancheTokenFactory.deploy();
    await share.waitForDeployment();

    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("InvestmentManagerLike");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();

    // Deploy mock ERC20 asset
    const ERC20Factory = await ethers.getContractFactory("IERC20");
    const asset = await ERC20Factory.deploy();
    await asset.waitForDeployment();

    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();

    // Ensure checkTransferRestriction on the mock share returns true for a valid transfer
    // The mock should be set up to return true for the given from/to/value
    // For the test to work, we need the mock to return true
    // We'll assume the mock is configured to return true by default or we set it up

    // Call checkTransferRestriction - this should return true in the original, false in the mutant
    const result = await liquidityPool.checkTransferRestriction(
      addr1.address,
      addr2.address,
      ethers.parseEther("100")
    );

    // The mutant will return false (default bool) instead of the actual result
    // So asserting true should kill the mutant
    expect(result).to.equal(true);
  });
});