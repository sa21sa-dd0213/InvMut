import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m2bb10e16 by calling transferFrom with amount equal to allowance", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the owner with tokens via the NETM function (onlyOwner)
    await instance.NETM();

    // Owner approves spender for a specific amount
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, approveAmount);

    // Owner transfers some tokens to themselves to have balance for transferFrom
    // (owner already has totalDistributed from NETM call)
    
    // Spender calls transferFrom with amount EQUAL to allowance
    // In original: should succeed (<=)
    // In mutant: should revert (<)
    await expect(
      instance.connect(spender).transferFrom(
        owner.address,
        recipient.address,
        approveAmount // exact same as allowance
      )
    ).to.be.reverted;
  });
});