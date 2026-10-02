import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m44a9ed6d - revert removal", function () {
  it("should revert when one of the transfers in the loop fails, but mutant silently succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The contract has hardcoded addresses:
    // from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    
    // The transfer function requires msg.sender == from address
    // We need to impersonate or use the from address
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the from address to pay for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });
    
    // Create recipients array with a valid and an invalid recipient
    // The caddress is 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // We'll use address(0) as an invalid recipient that should cause transferFrom to fail
    const recipients = [addr1.address, ethers.ZeroAddress];
    const values = [1, 1]; // 1 token each
    
    // On the original contract, this should revert because the second transfer fails
    // On the mutant, it will succeed silently
    await expect(
      instance.connect(fromSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});