import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m18a33170 (transferFrom return value)", function () {
  it("should return true from transferFrom when valid transfer is performed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Give owner some tokens via the NETM() function
    await instance.connect(owner).NETM();

    // Owner approves addr1 to spend tokens
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, approveAmount);

    // Owner transfers some tokens to addr2 so addr2 has balance
    const transferAmount = ethers.parseEther("50");
    await instance.connect(owner).transfer(addr2.address, transferAmount);

    // Now addr1 transfers from owner to addr2 using allowance
    const transferFromAmount = ethers.parseEther("10");
    const result = await instance.connect(addr1).transferFrom(
      owner.address,
      addr2.address,
      transferFromAmount
    );

    // The mutated function returns false (default) instead of true
    // Original returns true, so this assertion will fail on the mutant
    expect(result).to.equal(true);
  });
});