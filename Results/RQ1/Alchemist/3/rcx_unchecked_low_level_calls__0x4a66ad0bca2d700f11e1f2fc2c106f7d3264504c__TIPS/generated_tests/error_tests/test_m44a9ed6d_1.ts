import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m44a9ed6d test", function () {
  it("should revert when transferFrom call fails, but mutant would not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has hardcoded addresses: from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9, caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // The transfer function requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const authorizedSigner = await ethers.getImpersonatedSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Fund the authorized signer with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // caddress is a contract at 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // We need to make the call fail. The call attempts to call transferFrom on caddress.
    // Since we don't know if caddress is a real contract or has transferFrom, 
    // we can make it fail by using a recipient that will cause the call to revert
    // or by using an amount that exceeds balance.
    
    // Use a recipient address that is the zero address, which will likely cause transferFrom to fail
    const tos = ["0x0000000000000000000000000000000000000000"];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // The original contract should revert when the external call fails
    // The mutant would NOT revert and would return true
    await expect(
      instance.connect(authorizedSigner).transfer(tos, amounts)
    ).to.be.reverted;
  });
});