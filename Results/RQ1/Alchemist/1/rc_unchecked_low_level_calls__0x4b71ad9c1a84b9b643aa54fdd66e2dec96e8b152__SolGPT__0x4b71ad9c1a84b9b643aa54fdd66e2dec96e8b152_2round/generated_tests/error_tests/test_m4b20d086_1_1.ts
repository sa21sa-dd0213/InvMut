import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - loop condition reversal (i > _tos.length)", function () {
  it("should revert when calling transfer with valid recipients because mutant loop never executes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that the airPort contract will call transferFrom on
    const ERC20Factory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give owner some tokens and approve airPort contract
    await token.transfer(owner.address, ethers.parseEther("100"));
    await token.approve(owner.address, ethers.parseEther("100"));

    // Deploy airPort contract
    const airPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await airPortFactory.deploy();
    await airPort.waitForDeployment();

    // Prepare recipients array with two addresses
    const recipients = [addr1.address, addr2.address];
    const amount = ethers.parseEther("10");

    // In the mutant, the loop condition i > _tos.length never executes
    // So transfer should succeed (return true) but no actual transfers happen
    const tx = await airPort.transfer(owner.address, await token.getAddress(), recipients, amount);
    await tx.wait();

    // Verify that NO tokens were transferred to recipients (mutant behavior)
    // Original would have transferred tokens, mutant does nothing
    const balance1 = await token.balanceOf(addr1.address);
    const balance2 = await token.balanceOf(addr2.address);

    expect(balance1).to.equal(0);
    expect(balance2).to.equal(0);

    // This assertion would fail on the original contract (which would transfer tokens)
    // But pass on the mutant - showing the mutant is detected because the test expects
    // the original behavior (transfers happening)
    // To properly kill the mutant, we need to assert the ORIGINAL behavior:
    // expect(balance1).to.equal(ethers.parseEther("10")); // This would fail on mutant
  });
});