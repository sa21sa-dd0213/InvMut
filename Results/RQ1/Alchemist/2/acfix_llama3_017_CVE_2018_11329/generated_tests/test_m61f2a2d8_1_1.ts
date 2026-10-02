import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m61f2a2d8 test", function () {
  it("should kill mutant by verifying CEO receives exactly 4% of msg.value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first
    await instance.connect(addr1).seedMarket(1000, { value: ethers.parseEther("10") });

    // Get CEO address
    const ceoAddress = await instance.ceoAddress();

    // Get CEO balance before buy
    const ceoBalanceBefore = await ethers.provider.getBalance(ceoAddress);

    // Buy drugs with a specific amount
    const buyAmount = ethers.parseEther("1");
    const expectedFee = (buyAmount * 4n) / 100n; // 4% of msg.value

    await instance.connect(addr2).buyDrugs({ value: buyAmount });

    // Get CEO balance after buy
    const ceoBalanceAfter = await ethers.provider.getBalance(ceoAddress);

    // The CEO should have received exactly 4% of msg.value
    const ceoReceived = ceoBalanceAfter - ceoBalanceBefore;
    expect(ceoReceived).to.equal(expectedFee);
  });
});