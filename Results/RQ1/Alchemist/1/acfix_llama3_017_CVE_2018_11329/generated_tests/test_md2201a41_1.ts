import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant test - md2201a41", function () {
  it("should detect the mutant by sending 1 wei and checking getMyDrugs returns 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Send exactly 1 wei to buyDrugs
    const tx = await instance.connect(addr1).buyDrugs({ value: 1 });
    await tx.wait();

    // Check that getMyDrugs returns 0 for addr1
    const myDrugs = await instance.connect(addr1).getMyDrugs();
    expect(myDrugs).to.equal(0);
  });
});