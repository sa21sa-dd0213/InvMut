import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m23cb97f9 - getFreeKilo", function () {
  it("should allow a new user with zero kilos to call getFreeKilo, but mutant reverts due to !=0 check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Verify addr1 has zero kilos initially
    expect(await instance.getMyKilo()).to.equal(0);

    // Call getFreeKilo - this should succeed on original but revert on mutant
    // because mutant requires Kilos[msg.sender] != 0 (which is false for new user)
    await expect(
      instance.connect(addr1).getFreeKilo()
    ).to.be.reverted;
  });
});