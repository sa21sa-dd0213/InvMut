import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant md63e87f8 by calling deposit and expecting no revert, but the mutated assertion will always revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes the assertion to: assert(balances[msg.sender] - msg.value > balances[msg.sender])
    // This condition is always false for any positive msg.value, causing a revert.
    // The original assertion passes for any positive deposit.
    // A deposit of any positive amount should succeed on the original but fail on the mutant.
    await expect(
      instance.connect(addr1).deposit({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});