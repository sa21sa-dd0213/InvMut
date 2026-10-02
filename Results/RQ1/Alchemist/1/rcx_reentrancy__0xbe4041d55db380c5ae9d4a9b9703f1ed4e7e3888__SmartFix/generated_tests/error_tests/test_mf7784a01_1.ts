import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection", function () {
  it("should detect mutant mf7784a01 by sending msg.value = 0 when balance > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, send a normal deposit to create a positive balance for addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Put(100, { value: depositAmount });

    // Now send a transaction with msg.value = 0 via the fallback function (which calls Put(0))
    // This should succeed on original but revert on mutant because 0 * balance >= balance is false
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: 0,
        data: "0x"
      })
    ).to.be.reverted;
  });
});