import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant me2b6241a - donate subtracts 1 wei", function () {
  it("should detect that donate sends msg.value-1 instead of msg.value to whale", async function () {
    const [owner, whale, donor] = await ethers.getSigners();

    // Deploy with constructor arguments: whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();

    // Fund the contract with some initial balance (so we can check balances)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record initial balances
    const initialContractBalance = await instance.ethBalance();
    const initialWhaleBalance = await ethers.provider.getBalance(whale.address);

    // Donor donates exactly 5 ether
    const donationAmount = ethers.parseEther("5");
    const tx = await instance.connect(donor).donate({ value: donationAmount });
    await tx.wait();

    // Check final balances
    const finalContractBalance = await instance.ethBalance();
    const finalWhaleBalance = await ethers.provider.getBalance(whale.address);

    // Calculate actual transfer to whale
    const whaleReceived = finalWhaleBalance - initialWhaleBalance;
    const contractDecrease = initialContractBalance - finalContractBalance;

    // In the original contract: contract decreases by donationAmount, whale receives donationAmount
    // In the mutant: contract decreases by donationAmount, but whale receives donationAmount - 1 wei
    // The 1 wei difference gets stuck in the contract

    // Test that will pass on original but fail on mutant:
    // The whale should have received exactly the donation amount
    expect(whaleReceived).to.equal(donationAmount);

    // The contract balance should have decreased by exactly the donation amount
    expect(contractDecrease).to.equal(donationAmount);
  });
});