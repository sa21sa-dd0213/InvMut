import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant mcfabf996", function () {
  it("should kill the mutant by transferring full balance and verifying sender balance becomes zero", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract - no constructor arguments needed based on the contract code
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, call NETM() to initialize owner's balance with totalDistributed (250000000e18)
    await instance.connect(owner).NETM();

    // Get owner's initial balance
    const initialBalance = await instance.balanceOf(owner.address);

    // Transfer the entire balance from owner to addr1
    await instance.connect(owner).transfer(addr1.address, initialBalance);

    // After transfer, owner's balance should be exactly 0
    // In the mutant, it would be 1 (because initialBalance / initialBalance = 1)
    const ownerFinalBalance = await instance.balanceOf(owner.address);
    expect(ownerFinalBalance).to.equal(0);
  });
});