import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m61f2a2d8", function () {
  it("should send correct 4% devFee to CEO when buying drugs", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get CEO address from contract
    const ceoAddress = await instance.ceoAddress();

    // First, seed the market so contract is initialized
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Record CEO balance before buy
    const ceoBalanceBefore = await ethers.provider.getBalance(ceoAddress);

    // Send exact amount of ETH to buyDrugs
    const sendAmount = ethers.parseEther("10");
    const tx = await instance.connect(addr1).buyDrugs({ value: sendAmount });
    await tx.wait();

    // Calculate expected fee: 4% of msg.value
    const expectedFee = (sendAmount * 4n) / 100n;

    // Get CEO balance after
    const ceoBalanceAfter = await ethers.provider.getBalance(ceoAddress);
    const actualFee = ceoBalanceAfter - ceoBalanceBefore;

    // Assert CEO received exactly 4% of the sent amount
    expect(actualFee).to.equal(expectedFee);
  });
});