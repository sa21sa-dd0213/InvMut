import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m39e45538 - buyShares with baseReserve == 0 and quoteReserve > 0", function () {
  it("should revert on original when baseReserve == 0 and quoteReserve > 0, but succeed (or behave differently) on mutant", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const baseToken = await MockToken.deploy("Base", "BASE", 18);
    const quoteToken = await MockToken.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      owner.address,
      ethers.parseEther("1"), // _I_
      ethers.parseEther("0.5"), // _K_
      0, // _LP_FEE_RATE_
      0, // _MT_FEE_RATE_
      false // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();

    // Setup: Mint initial tokens
    await baseToken.mint(owner.address, ethers.parseEther("100"));
    await quoteToken.mint(owner.address, ethers.parseEther("100"));
    await baseToken.approve(await instance.getAddress(), ethers.parseEther("100"));
    await quoteToken.approve(await instance.getAddress(), ethers.parseEther("100"));

    // First buyShares to create initial liquidity
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("10"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("10"));
    await instance.connect(owner).buyShares(owner.address);

    // Now drain the base reserve to make baseReserve == 0
    const shares = await instance.balanceOf(owner.address);
    
    if (shares > 0n) {
      await instance.connect(owner).sellShares(
        shares,
        owner.address,
        0,
        0,
        "0x",
        Math.floor(Date.now() / 1000) + 3600
      );
    }

    // Add only quote tokens to create imbalance (baseReserve == 0, quoteReserve > 0)
    await quoteToken.mint(user.address, ethers.parseEther("5"));
    await quoteToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("5"));
    await quoteToken.connect(user).transfer(await instance.getAddress(), ethers.parseEther("5"));

    // Call buyShares - should revert because baseInput > 0 check fails
    await expect(
      instance.connect(user).buyShares(user.address)
    ).to.be.revertedWith("NO_BASE_INPUT");
  });
});