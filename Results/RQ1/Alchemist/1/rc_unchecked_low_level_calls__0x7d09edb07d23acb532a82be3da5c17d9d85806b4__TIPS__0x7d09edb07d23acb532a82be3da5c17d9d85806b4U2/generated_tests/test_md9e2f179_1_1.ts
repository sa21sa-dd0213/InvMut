import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant md9e2f179 test", function () {
  it("should detect mutant that removes return statement from ethBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open to public so we can wager
    await instance.OpenToThePublic();

    // Initial balance should be 0
    const initialBalance = await instance.ethBalance();
    expect(initialBalance).to.equal(0);

    // Wager some ETH to increase contract balance
    const wagerAmount = ethers.parseEther("1");
    await instance.connect(addr1).wager({ value: wagerAmount });

    // After wager, ethBalance should return the contract's balance (which is 1 ETH)
    const balanceAfterWager = await instance.ethBalance();
    expect(balanceAfterWager).to.equal(wagerAmount);
  });
});