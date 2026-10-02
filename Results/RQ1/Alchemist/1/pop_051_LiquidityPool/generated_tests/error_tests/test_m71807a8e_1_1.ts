import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - deposit withApproval", function () {
  it("should revert when caller is not the receiver (original has withApproval modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const assetAddress = "0x0000000000000000000000000000000000000001"; // placeholder - must be real ERC20
    const shareAddress = "0x0000000000000000000000000000000000000002"; // placeholder - must be real TrancheTokenLike
    const investmentManagerAddress = "0x0000000000000000000000000000000000000003"; // placeholder - must be real InvestmentManagerLike

    const Factory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await Factory.deploy(
      poolId,
      trancheId,
      assetAddress,
      shareAddress,
      investmentManagerAddress
    );
    await liquidityPool.waitForDeployment();

    // Attempt to call deposit with addr1 as caller but addr2 as receiver
    // The original contract requires msg.sender == receiver via withApproval modifier
    // addr1 is not addr2, so this should revert
    await expect(
      liquidityPool.connect(addr1).deposit(
        ethers.parseEther("100"),
        addr2.address
      )
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});