import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m138910cb test", function () {
  it("should revert when buying shares with zero base input", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with required constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      0, // _I_ (initial price)
      0, // _K_ (initial K value)
      0, // _LP_FEE_RATE_
      0, // _MT_FEE_RATE_
      ethers.parseEther("1000"), // _BASE_TARGET_ (initial)
      ethers.parseEther("1000"), // _QUOTE_TARGET_ (initial)
      false // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();

    // Fund the contract with some quote tokens to allow initial buy
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));

    // Attempt to buy shares without sending any base tokens (baseInput will be 0)
    // First approve quote tokens for transfer (not needed for buyShares)
    // Call buyShares with zero base input - should revert with "NO_BASE_INPUT"
    await expect(
      instance.connect(addr1).buyShares(addr1.address)
    ).to.be.revertedWith("NO_BASE_INPUT");
  });
});