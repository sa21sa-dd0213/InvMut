import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m4d4c5d55 - file function string comparison", function () {
  it("should revert when calling file with a string lexicographically less than 'investmentManager'", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock token for share parameter (simple ERC20)
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const mockShare = await MockTokenFactory.deploy("Share", "SHR", 18);
    await mockShare.waitForDeployment();

    // Deploy mock InvestmentManager
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManagerFactory.deploy();
    await mockInvestmentManager.waitForDeployment();

    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const asset = mockShare.target; // using same token for simplicity
    const share = mockShare.target;
    const investmentManager = mockInvestmentManager.target;

    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      asset,
      share,
      investmentManager
    );
    await liquidityPool.waitForDeployment();

    // Test case: call file with a string that is lexicographically less than "investmentManager"
    // "investmentManager" - "anything" comparison: 'a' < 'i', so "anything" < "investmentManager"
    const wrongParam = ethers.encodeBytes32String("anything");
    const fakeAddress = ethers.Wallet.createRandom().address;

    // Original contract should revert because "anything" !== "investmentManager"
    // Mutant would incorrectly accept because "anything" <= "investmentManager" is true
    await expect(
      liquidityPool.connect(owner).file(wrongParam, fakeAddress)
    ).to.be.revertedWith("LiquidityPool/file-unrecognized-param");

    // Verify investmentManager was not changed
    const currentManager = await liquidityPool.investmentManager();
    expect(currentManager).to.equal(investmentManager);
  });
});