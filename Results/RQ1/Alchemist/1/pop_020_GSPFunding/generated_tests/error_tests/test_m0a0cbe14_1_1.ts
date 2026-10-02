import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding - Mutant m0a0cbe14 (buyShares < to >)", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with constructor arguments:
    // maintainer, baseToken, quoteToken, lpFeeRate, mtFeeRate, K, I, isOpenTWAP
    const Factory = await ethers.getContractFactory("GSPFunding");
    instance = await Factory.deploy(
      owner.address,
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("0.003"), // lpFeeRate (0.3%)
      ethers.parseEther("0.001"), // mtFeeRate (0.1%)
      ethers.parseEther("0.5"),   // K
      ethers.parseEther("1"),     // I
      false                        // isOpenTWAP
    );
    await instance.waitForDeployment();

    // Fund owner with tokens
    await baseToken.mint(owner.address, ethers.parseEther("10000"));
    await quoteToken.mint(owner.address, ethers.parseEther("10000"));

    // Approve GSPFunding to spend tokens
    await baseToken.approve(await instance.getAddress(), ethers.parseEther("10000"));
    await quoteToken.approve(await instance.getAddress(), ethers.parseEther("10000"));
  });

  it("should detect mutant by checking initial shares calculation when quoteBalance < baseValue", async function () {
    // Calculate baseValue = baseBalance * I (where I = 1)
    const baseBalance = ethers.parseEther("2000");
    const quoteBalance = ethers.parseEther("1000");
    const baseValue = ethers.parseEther("2000"); // baseBalance * I = 2000 * 1

    // Transfer tokens to contract to create initial reserves
    await baseToken.transfer(await instance.getAddress(), baseBalance);
    await quoteToken.transfer(await instance.getAddress(), quoteBalance);

    // Call buyShares - this is the first mint (totalSupply == 0)
    // In original: shares = min(quoteBalance, baseValue) = min(1000, 2000) = 1000
    // In mutant: shares = max(quoteBalance, baseValue) = max(1000, 2000) = 2000
    const tx = await instance.connect(owner).buyShares(owner.address);
    const receipt = await tx.wait();

    // Get the minted shares from the BuyShares event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = instance.interface.parseLog(log);
        return parsed?.name === "BuyShares";
      } catch {
        return false;
      }
    });
    const parsedEvent = instance.interface.parseLog(event);
    const mintedShares = parsedEvent.args.increaseShares;

    // In the original, shares should be 1000 (the smaller value)
    // In the mutant, shares would be 2000 (the larger value)
    // The difference is detectable because the mutant mints more shares than the actual liquidity ratio
    expect(mintedShares).to.equal(ethers.parseEther("1000"));
  });

  it("should detect mutant by verifying BASE_TARGET after initial mint", async function () {
    const baseBalance = ethers.parseEther("3000");
    const quoteBalance = ethers.parseEther("1000");

    await baseToken.transfer(await instance.getAddress(), baseBalance);
    await quoteToken.transfer(await instance.getAddress(), quoteBalance);

    await instance.connect(owner).buyShares(owner.address);

    // Original sets _BASE_TARGET_ = shares (which is min(1000, 3000) = 1000)
    // Mutant sets _BASE_TARGET_ = shares (which is max(1000, 3000) = 3000)
    const baseTarget = await instance._BASE_TARGET_();
    expect(baseTarget).to.equal(ethers.parseEther("1000"));
  });
});