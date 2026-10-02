import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m3aae3d6c by testing insufficient balance revert in transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Give addr1 some tokens via the distribution mechanism
    // First, ensure distribution is not finished
    // We need to call getTokens() but it requires not being blacklisted and distribution not finished
    // Get the initial value from the contract
    const initialValue = await instance.value();

    // Send ether to trigger getTokens via receive() or call getTokens directly
    // For simplicity, call getTokens() directly from addr1
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Get addr1's balance after receiving tokens
    const addr1Balance = await instance.balanceOf(addr1.address);

    // Attempt to transfer more than addr1's balance - this should revert in original
    // but mutant would allow it
    const excessiveAmount = addr1Balance + BigInt(1);

    await expect(
      instance.connect(addr1).transfer(addr2.address, excessiveAmount)
    ).to.be.reverted;
  });
});