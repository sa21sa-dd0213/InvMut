import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant maa861c12 test", function () {
  it("should detect mutant by testing Collect when balance equals MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get the MinSum value (1 ether)
    const minSum = await instance.MinSum();

    // Fund addr1 with exactly MinSum (1 ether)
    await instance.connect(addr1).Put(0, { value: minSum });

    // Verify balance equals MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(minSum);

    // Attempt to collect exactly MinSum - should succeed on original but fail on mutant
    // because mutant requires balance > MinSum instead of >=
    await expect(
      instance.connect(addr1).Collect(minSum)
    ).to.be.reverted;
  });
});