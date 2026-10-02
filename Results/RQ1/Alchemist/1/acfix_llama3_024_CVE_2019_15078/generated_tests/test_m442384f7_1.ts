import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - allowance return value", function () {
  it("should detect mutant that does not return stored allowance value", async function () {
    const [owner, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve spender to transfer 100 tokens
    const approveAmount = ethers.parseEther("100");
    const approveTx = await instance.connect(owner).approve(spender.address, approveAmount);
    await approveTx.wait();

    // Query allowance - mutant will not return the stored value
    const returnedAllowance = await instance.allowance(owner.address, spender.address);

    // Assert that the returned allowance matches the approved amount
    expect(returnedAllowance).to.equal(approveAmount);
  });
});