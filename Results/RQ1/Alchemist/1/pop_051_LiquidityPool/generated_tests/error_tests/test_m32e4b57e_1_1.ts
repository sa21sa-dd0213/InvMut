import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - transferFrom return value", function () {
  it("should detect mutant m32e4b57e by verifying transferFrom returns true on successful transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 token for asset
    const AssetFactory = await ethers.getContractFactory("MockERC20");
    const asset = await AssetFactory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();

    // Deploy mock TrancheToken (share)
    const ShareFactory = await ethers.getContractFactory("MockTrancheToken");
    const share = await ShareFactory.deploy("Tranche", "TRN", 18);
    await share.waitForDeployment();

    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();

    // Deploy LiquidityPool with constructor args: poolId, trancheId, asset, share, investmentManager
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await pool.waitForDeployment();

    // Mint some share tokens to addr1 so they can transfer
    await share.mint(await addr1.getAddress(), ethers.parseEther("100"));

    // Approve pool to spend addr1's shares
    await share.connect(addr1).approve(await pool.getAddress(), ethers.parseEther("50"));

    // Call transferFrom through pool (which forwards to share with appended msg.sender)
    const tx = await pool.connect(addr2).transferFrom(
      await addr1.getAddress(),
      await addr2.getAddress(),
      ethers.parseEther("10")
    );

    // The original returns the boolean from abi.decode, mutant returns false
    // Expect true for a successful transfer
    expect(tx).to.equal(true);

    // Verify the actual transfer happened
    expect(await share.balanceOf(await addr2.getAddress())).to.equal(ethers.parseEther("10"));
    expect(await share.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("90"));
  });
});