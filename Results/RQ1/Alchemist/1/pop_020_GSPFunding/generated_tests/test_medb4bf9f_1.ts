import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant medb4bf9f - BuyShares event emission", function () {
  it("should emit BuyShares event when buying shares for the first time", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding - note: constructor arguments may vary; we assume no constructor args
    const Factory = await ethers.getContractFactory("GSPFunding");
    const gsp = await Factory.deploy();
    await gsp.waitForDeployment();

    // Initialize the contract (if needed - depends on actual contract)
    // For this test, we assume buyShares can be called directly with tokens sent

    // Fund the contract with base and quote tokens
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    await baseToken.transfer(await gsp.getAddress(), baseAmount);
    await quoteToken.transfer(await gsp.getAddress(), quoteAmount);

    // Call buyShares
    const tx = await gsp.connect(addr1).buyShares(addr1.address);

    // Verify the BuyShares event was emitted with correct parameters
    await expect(tx)
      .to.emit(gsp, "BuyShares")
      .withArgs(addr1.address, ethers.anyValue, ethers.anyValue); // shares and totalShares are dynamic
  });
});