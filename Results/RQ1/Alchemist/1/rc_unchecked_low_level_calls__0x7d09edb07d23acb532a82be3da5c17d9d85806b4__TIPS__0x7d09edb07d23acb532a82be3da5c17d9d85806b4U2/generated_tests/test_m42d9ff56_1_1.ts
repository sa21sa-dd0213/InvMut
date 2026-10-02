import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m42d9ff56 - winnersPot", function () {
  it("should return half the contract balance, not balance minus 2", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.OpenToThePublic();

    // Send ether directly to the contract to simulate deposits (e.g., via fallback)
    const depositAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount,
    });

    // Get the contract balance
    const balance = await ethers.provider.getBalance(await instance.getAddress());

    // Call winnersPot
    const pot = await instance.winnersPot();

    // Expected: half the balance (balance / 2)
    const expectedPot = balance / 2n;

    // Assert that the returned value is exactly half, not balance - 2
    expect(pot).to.equal(expectedPot);
  });
});