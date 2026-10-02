import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m4667cc00 - migrateTo access control", function () {
  it("should allow creator to call migrateTo and transfer contract balance", async function () {
    const [creator, otherAccount] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some ETH into the contract so it has balance to migrate
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(otherAccount).deposit({ value: depositAmount });

    // Creator calls migrateTo, should succeed on original, fail on mutant
    await expect(
      instance.connect(creator).migrateTo(otherAccount.address)
    ).to.not.be.reverted;

    // Verify the balance was transferred
    const contractBalance = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalance).to.equal(0);
  });
});